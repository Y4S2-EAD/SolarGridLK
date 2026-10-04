package com.solargridlk.mobile.ui.gridoperator

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.ImageButton
import android.widget.Spinner
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.tasks.CancellationTokenSource
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.NodeApiClient
import com.solargridlk.mobile.data.local.AppDatabase
import com.solargridlk.mobile.data.local.NodeDao
import com.solargridlk.mobile.data.local.NodeEntity
import com.solargridlk.mobile.data.model.Node
import kotlinx.coroutines.launch

class NodesMapActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var map: GoogleMap
    private lateinit var areaSpinner: Spinner
    private lateinit var nearbySwitch: SwitchCompat
    private lateinit var fusedClient: FusedLocationProviderClient

    private var allNodes: List<Node> = emptyList()
    private var selectedArea: String = "All areas"
    private var nearbyOn: Boolean = false

    private val nearbyRadiusMeters = 10_000f
    private val latRange = 5.5..10.2
    private val lngRange = 79.2..82.2

    private val locationPermLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                enableMyLocation()
                applyFilters()
            } else {
                nearbyOn = false
                nearbySwitch.isChecked = false
                Toast.makeText(this, "Location permission is needed for nearby nodes", Toast.LENGTH_LONG).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nodes_map)

        findViewById<ImageButton>(R.id.backButton).setOnClickListener { finish() }
        areaSpinner = findViewById(R.id.areaSpinner)
        nearbySwitch = findViewById(R.id.nearbySwitch)
        fusedClient = LocationServices.getFusedLocationProviderClient(this)

        nearbySwitch.setOnCheckedChangeListener { _, checked ->
            nearbyOn = checked
            if (checked && !hasLocationPermission()) {
                locationPermLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
            } else {
                applyFilters()
            }
        }

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.mapFragment) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(googleMap: GoogleMap) {
        map = googleMap
        map.uiSettings.isZoomControlsEnabled = true
        map.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(7.8731, 80.7718), 7f))
        if (hasLocationPermission()) enableMyLocation()
        loadNodes()
    }

    private fun loadNodes() {
        lifecycleScope.launch {
            val dao = AppDatabase.get(this@NodesMapActivity).nodeDao()

            val nodes: List<Node> = try {
                val res = NodeApiClient.create(this@NodesMapActivity).getNodes()
                val live = res.body()?.data
                if (res.isSuccessful && !live.isNullOrEmpty()) {
                    dao.upsertAll(
                        live.filter { it.id != null }.map {
                            NodeEntity(it.id!!, it.name, it.latitude, it.longitude, it.status, it.capacityKw, it.location)
                        }
                    )
                    live
                } else {
                    loadCached(dao)
                }
            } catch (e: Exception) {
                loadCached(dao)
            }

            allNodes = nodes
            setupAreaFilter(nodes)
            applyFilters()
        }
    }

    // Real cached data only — no mock/sample fallback
    private suspend fun loadCached(dao: NodeDao): List<Node> {
        val cached = dao.getAll()
        if (cached.isEmpty()) {
            Toast.makeText(this, "No node data available (offline)", Toast.LENGTH_SHORT).show()
            return emptyList()
        }
        Toast.makeText(this, "Offline — showing last saved nodes", Toast.LENGTH_SHORT).show()
        return cached.map { Node(it.id, it.name, it.latitude, it.longitude, it.status, it.capacityKw, it.location) }
    }

    private fun setupAreaFilter(nodes: List<Node>) {
        val districts = nodes.mapNotNull { it.location?.trim() }
            .filter { it.isNotEmpty() }.distinct().sorted()
        val areas = listOf("All areas") + districts

        val adapter = ArrayAdapter(this, R.layout.spinner_item, areas)
        adapter.setDropDownViewResource(R.layout.spinner_item)
        areaSpinner.adapter = adapter

        areaSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedArea = areas[position]
                applyFilters()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    /** Central filter: district selection first, then optional 10 km proximity. */
    private fun applyFilters() {
        val base = if (selectedArea == "All areas") allNodes
        else allNodes.filter { it.location?.trim().equals(selectedArea, ignoreCase = true) }

        if (nearbyOn && hasLocationPermission()) {
            filterNearbyThenPlot(base)
        } else {
            plotNodes(base)
        }
    }

    @SuppressLint("MissingPermission")
    private fun filterNearbyThenPlot(base: List<Node>) {
        enableMyLocation()
        val cts = CancellationTokenSource()
        fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
            .addOnSuccessListener { loc ->
                if (loc == null) {
                    Toast.makeText(this, "Current location unavailable — set a location in the emulator (Extended controls → Location)", Toast.LENGTH_LONG).show()
                    plotNodes(base)
                    return@addOnSuccessListener
                }
                val nearby = base.filter { n ->
                    val lat = n.latitude ?: return@filter false
                    val lng = n.longitude ?: return@filter false
                    if (lat !in latRange || lng !in lngRange) return@filter false
                    val r = FloatArray(1)
                    Location.distanceBetween(loc.latitude, loc.longitude, lat, lng, r)
                    r[0] <= nearbyRadiusMeters
                }
                Toast.makeText(this, "${nearby.size} node(s) within 10 km", Toast.LENGTH_SHORT).show()

                plotNodes(nearby, fitCamera = false)
                map.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(LatLng(loc.latitude, loc.longitude), 11f)
                )
            }
            .addOnFailureListener {
                Toast.makeText(this, "Could not get current location", Toast.LENGTH_SHORT).show()
                plotNodes(base)
            }
    }

    @SuppressLint("MissingPermission")
    private fun enableMyLocation() {
        if (hasLocationPermission()) {
            try { map.isMyLocationEnabled = true } catch (_: SecurityException) {}
        }
    }

    private fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

    private fun plotNodes(nodes: List<Node> , fitCamera: Boolean = true) {
        if (!::map.isInitialized) return
        map.clear()

        val boundsBuilder = LatLngBounds.Builder()
        var plotted = 0

        for (node in nodes) {
            val lat = node.latitude ?: continue
            val lng = node.longitude ?: continue
            if (lat !in latRange || lng !in lngRange) continue
            val pos = LatLng(lat, lng)

            val color = if (node.status?.equals("Active", true) == true)
                BitmapDescriptorFactory.HUE_GREEN
            else
                BitmapDescriptorFactory.HUE_RED

            val snippet = buildString {
                node.status?.let { append("Status: $it") }
                node.capacityKw?.let { append("  ·  ${it}kW") }
            }

            map.addMarker(
                MarkerOptions()
                    .position(pos)
                    .title(node.name ?: node.id ?: "Node")
                    .snippet(snippet)
                    .icon(BitmapDescriptorFactory.defaultMarker(color))
            )
            boundsBuilder.include(pos)
            plotted++
        }

        if (fitCamera && plotted > 0) {
            map.moveCamera(CameraUpdateFactory.newLatLngBounds(boundsBuilder.build(), 120))
        }
    }
}