package com.solargridlk.mobile.ui.gridoperator

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.NodeApiClient
import com.solargridlk.mobile.data.model.Node
import kotlinx.coroutines.launch

class NodesMapActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var map: GoogleMap

    // Fallback sample nodes (real Sri Lanka coords) so the map always demos
    private val sampleNodes = listOf(
        Node("NODE-001", "Colombo Fort Hub", 6.9344, 79.8428, "Active", 25.0),
        Node("NODE-002", "Nugegoda Substation", 6.8649, 79.8997, "Active", 18.0),
        Node("NODE-003", "Moratuwa Solar Cluster", 6.7730, 79.8816, "Offline", 12.0),
        Node("NODE-004", "Kandy Grid Point", 7.2906, 80.6337, "Active", 20.0),
        Node("NODE-005", "Galle Coastal Node", 6.0535, 80.2210, "Active", 15.0)
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nodes_map)

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.mapFragment) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(googleMap: GoogleMap) {
        map = googleMap
        map.uiSettings.isZoomControlsEnabled = true
        loadNodes()
    }

    private fun loadNodes() {
        lifecycleScope.launch {
            val nodes: List<Node> = try {
                val res = NodeApiClient.create(this@NodesMapActivity).getNodes()
                val live = res.body()?.data
                if (res.isSuccessful && !live.isNullOrEmpty()) {
                    live
                } else {
                    Toast.makeText(this@NodesMapActivity,
                        "Using sample nodes (no live data)", Toast.LENGTH_SHORT).show()
                    sampleNodes
                }
            } catch (e: Exception) {
                Toast.makeText(this@NodesMapActivity,
                    "Offline — showing sample nodes", Toast.LENGTH_SHORT).show()
                sampleNodes
            }
            plotNodes(nodes)
        }
    }

    private fun plotNodes(nodes: List<Node>) {
        val boundsBuilder = LatLngBounds.Builder()
        var plotted = 0

        for (node in nodes) {
            val lat = node.latitude ?: continue
            val lng = node.longitude ?: continue
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

        if (plotted > 0) {
            map.moveCamera(
                CameraUpdateFactory.newLatLngBounds(boundsBuilder.build(), 120)
            )
        }
    }
}